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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function SalesOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales-orders-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/sales?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customer?.name && s.customer.name.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || s.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [sales, search, statusFilter]);

  const totalRevenue = useMemo(() => {
    return sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  }, [sales]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage order bookings, fulfillments, dispatch deadlines, and payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Link href="/pos">
            <Button size="sm" className="gap-1.5 bg-primary">
              <Plus className="w-4 h-4" /> New Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Orders</p>
              <h3 className="text-2xl font-bold mt-1">{sales.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Gross Bookings</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(totalRevenue)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Paid Orders</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600">
                {sales.filter((s) => s.paymentStatus === 'PAID').length}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search order ID or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading orders...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No sales orders recorded.</TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {s.invoiceNo || s.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.customerName || s.customer?.name || 'Walk-in Customer'}</div>
                      {s.customerGstin && <div className="text-xs text-muted-foreground font-mono">{s.customerGstin}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.date || s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs font-normal">
                        {s.paymentMethod || 'Cash'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatSystemAmount(Number(s.total) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          s.paymentStatus === 'PAID'
                            ? 'default'
                            : s.paymentStatus === 'PARTIAL'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {s.paymentStatus || 'COMPLETED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/invoices`}>
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
