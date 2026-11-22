'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
  SlidersHorizontal,
  Search,
  Printer,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function StockAdjustmentPage() {
  const [search, setSearch] = useState('');

  const { data: adjustments = [], isLoading } = useQuery<any[]>({
    queryKey: ['stock-adjustments-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/adjustments?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return adjustments.filter((a) => {
      const q = search.toLowerCase();
      return (
        (a.reason && a.reason.toLowerCase().includes(q)) ||
        (a.warehouse?.name && a.warehouse.name.toLowerCase().includes(q))
      );
    });
  }, [adjustments, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Stock Adjustments & Write-offs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track physical inventory reconciliations, scrap write-offs, and cycle-count variances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Link href="/adjustments">
            <Button size="sm" className="gap-1.5 bg-primary">
              <Plus className="w-4 h-4" /> New Adjustment
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by reason or warehouse..."
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
                <TableHead>Adjustment ID</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Items Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading adjustments...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No stock adjustments recorded.</TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      ADJ-{a.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{a.warehouse?.name || 'Main Warehouse'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">{a.type || 'RECONCILIATION'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.reason || 'Physical inventory audit'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.date || a.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{a.details?.length || 1} Products</Badge>
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
