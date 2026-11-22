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
  Building2,
  DollarSign,
} from 'lucide-react';

export default function PurchaseReturnPage() {
  const [search, setSearch] = useState('');

  const { data: returnsData, isLoading } = useQuery<any>({
    queryKey: ['purchase-returns-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/returns/purchases?limit=50');
      return res.data;
    },
  });

  const returns = Array.isArray(returnsData?.returns) ? returnsData.returns : [];

  const filtered = useMemo(() => {
    return returns.filter((r: any) => {
      const q = search.toLowerCase();
      return (
        (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
        (r.supplier?.name && r.supplier.name.toLowerCase().includes(q))
      );
    });
  }, [returns, search]);

  const totalDebit = useMemo(() => {
    return returns.reduce((acc: number, r: any) => acc + (Number(r.totalAmount) || 0), 0);
  }, [returns]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Purchase Returns & Debit Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage outbound supplier returns, debit notes, and inventory recovery.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Returns</p>
              <h3 className="text-2xl font-bold mt-1">{returns.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <RotateCcw className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Debit Balance Claimed</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{formatSystemAmount(totalDebit)}</h3>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Active Suppliers</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">
                {new Set(returns.map((r: any) => r.supplierId)).size}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search return # or supplier..."
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
                <TableHead>Return ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>PO Reference</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Print Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading purchase returns...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No purchase returns recorded.</TableCell>
                </TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {r.returnNumber || `PR-${r.id.slice(0, 6)}`}
                    </TableCell>
                    <TableCell className="font-medium">{r.supplier?.name || 'Vendor'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.purchase?.purchaseNo || 'PO Reference'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.returnDate || r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatSystemAmount(Number(r.totalAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{r.status || 'RETURNED'}</Badge>
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
