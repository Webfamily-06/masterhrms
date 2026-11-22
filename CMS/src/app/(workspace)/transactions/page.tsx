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
  Receipt,
  Search,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export default function TransactionsPage() {
  const [search, setSearch] = useState('');

  const { data: journals = [], isLoading } = useQuery<any[]>({
    queryKey: ['all-transactions-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/accounting/journal-entries?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.entries || res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return journals.filter((j) => {
      const q = search.toLowerCase();
      return (
        (j.entryNumber && j.entryNumber.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q))
      );
    });
  }, [journals, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Transaction History & Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Master double-entry transaction journal with automated debit/credit balancing.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Ledger
        </Button>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search transactions by entry # or memo..."
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
                <TableHead>Entry ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Debit (DR)</TableHead>
                <TableHead className="text-right">Credit (CR)</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading transaction entries...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No transactions found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {j.entryNumber || `TX-${j.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="font-medium">{j.description || j.memo || 'Ledger Posting'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(j.postingDate || j.date || j.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatSystemAmount(Number(j.totalDebit || j.amount || 0))}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatSystemAmount(Number(j.totalCredit || j.amount || 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">POSTED</Badge>
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
