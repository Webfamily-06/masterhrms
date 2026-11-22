'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
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
  Store,
  Printer,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';

export default function PosOrdersPage() {
  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['pos-orders-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/sales?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Point of Sale (POS) Order History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Counter sales, terminal checkouts, and instant receipt reprints.</p>
        </div>
        <Link href="/pos">
          <Button size="sm" className="gap-1.5 bg-primary">
            <Store className="w-4 h-4" /> Open POS Terminal
          </Button>
        </Link>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Receipt No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Register Time</TableHead>
                <TableHead className="text-right">Receipt Total</TableHead>
                <TableHead className="text-center">Method</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Reprint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading POS sales...</TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No POS sales processed.</TableCell>
                </TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold text-primary">{s.invoiceNo}</TableCell>
                    <TableCell className="font-medium">{s.customerName || 'Walk-in Customer'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(s.date || s.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{formatSystemAmount(Number(s.total) || 0)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs font-mono uppercase">{s.paymentMethod || 'CASH'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">PAID</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.print()}>
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
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
