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
  RotateCcw,
  Search,
  Printer,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export default function RefundsPage() {
  const [search, setSearch] = useState('');

  const { data: returnsData, isLoading } = useQuery<any>({
    queryKey: ['refunds-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/returns/sales?limit=50');
      return (res as any)?.data ?? res;
    },
  });

  const refunds = Array.isArray(returnsData?.returns) ? returnsData.returns : [];

  const filtered = useMemo(() => {
    return refunds.filter((r: any) => {
      const q = search.toLowerCase();
      return (
        (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
        (r.customer?.name && r.customer.name.toLowerCase().includes(q))
      );
    });
  }, [refunds, search]);

  const totalRefunded = useMemo(() => {
    return refunds.reduce((acc: number, r: any) => acc + (Number(r.totalAmount) || 0), 0);
  }, [refunds]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Refunds & Reversals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Audit cash disbursements, gateway refund references, and ledger adjustments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Audit Trail
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Refunds Processed</p>
              <h3 className="text-2xl font-bold mt-1">{refunds.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <RotateCcw className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Disbursed Amount</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{formatSystemAmount(totalRefunded)}</h3>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Settled to Source</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {refunds.filter((r: any) => r.status === 'COMPLETED').length}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
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
              placeholder="Search refund #, customer, reason..."
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
                <TableHead>Refund ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Ref</TableHead>
                <TableHead>Refund Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Refunded Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading refunds...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No customer refunds processed.</TableCell>
                </TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      REF-{r.returnNumber?.replace(/[^0-9]/g, '') || r.id.slice(0, 6)}
                    </TableCell>
                    <TableCell className="font-medium">{r.customer?.name || 'Walk-in Customer'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sale?.invoiceNo || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.returnDate || r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reason || 'Product Return'}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatSystemAmount(Number(r.totalAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {r.status || 'DISBURSED'}
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
