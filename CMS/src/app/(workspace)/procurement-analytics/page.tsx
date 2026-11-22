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
  Truck,
  TrendingUp,
  DollarSign,
  Package,
  Printer,
  CheckCircle2,
} from 'lucide-react';

export default function ProcurementAnalyticsPage() {
  const { data: purchases = [], isLoading } = useQuery<any[]>({
    queryKey: ['procurement-analytics-data'],
    queryFn: async () => {
      const res = await api.get<any>('/api/purchases?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const totalSpend = purchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const paidSpend = purchases.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);
  const pendingAccountsPayable = totalSpend - paidSpend;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Procurement & Supply Chain Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analyze vendor fulfillment reliability, accounts payable (AP), and procurement volumes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Procurement</p>
              <h3 className="text-2xl font-bold mt-1">{formatSystemAmount(totalSpend)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Committed Purchases</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Disbursed (Paid)</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(paidSpend)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Settled Invoices</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Accounts Payable (AP)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{formatSystemAmount(pendingAccountsPayable > 0 ? pendingAccountsPayable : 0)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Pending Supplier Dues</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Orders</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">{purchases.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">Purchase Records</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top Vendor Procurement Stream</CardTitle>
          <CardDescription>Live breakdown of purchase orders fulfilled by primary suppliers.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>PO ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Order Total</TableHead>
                <TableHead className="text-right">Paid Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Calculating metrics...</TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No procurement data available.</TableCell>
                </TableRow>
              ) : (
                purchases.slice(0, 10).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold text-primary">{p.purchaseNo || p.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{p.supplier?.name || p.supplierName || 'Vendor'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.date || p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatSystemAmount(Number(p.total) || 0)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatSystemAmount(Number(p.paidAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                        {p.status || p.paymentStatus || 'ACTIVE'}
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
