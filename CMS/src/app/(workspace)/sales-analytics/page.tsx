'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Printer,
  ArrowUpRight,
  Package,
} from 'lucide-react';

export default function SalesAnalyticsPage() {
  const { data: metrics, isLoading } = useQuery<any>({
    queryKey: ['sales-analytics-overview'],
    queryFn: async () => {
      const res = await api.get<any>('/api/dashboard/sales-crm');
      return (res as any)?.data ?? res;
    },
  });

  const { data: salesList = [] } = useQuery<any[]>({
    queryKey: ['sales-analytics-feed'],
    queryFn: async () => {
      const res = await api.get<any>('/api/sales?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const totalSalesVolume = salesList.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const paidSalesVolume = salesList.reduce((acc, s) => acc + (Number(s.paidAmount) || 0), 0);
  const outstandingAR = totalSalesVolume - paidSalesVolume;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales & Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Executive sales conversion velocities, gross receipts, and customer purchasing trends.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Gross Sales</p>
              <h3 className="text-2xl font-bold mt-1">{formatSystemAmount(totalSalesVolume)}</h3>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Live from ERP
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Realized Cash</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(paidSalesVolume)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Settled into Accounts</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Receivables (AR)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{formatSystemAmount(outstandingAR > 0 ? outstandingAR : 0)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Unpaid Balance</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Transaction Count</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">{salesList.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">Active Invoices</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent High-Value Invoices</CardTitle>
          <CardDescription>Top transaction records streaming directly from the tenant sales ledger.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Volume</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Calculating analytics...</TableCell>
                </TableRow>
              ) : salesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No sales data available yet.</TableCell>
                </TableRow>
              ) : (
                salesList.slice(0, 10).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold text-primary">{s.invoiceNo}</TableCell>
                    <TableCell className="font-medium">{s.customerName || 'Counter Sale'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.date || s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatSystemAmount(Number(s.total) || 0)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatSystemAmount(Number(s.paidAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                        {s.paymentStatus || 'COMPLETED'}
                      </Badge>
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
