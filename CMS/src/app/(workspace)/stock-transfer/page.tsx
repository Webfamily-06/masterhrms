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
  ArrowLeftRight,
  Search,
  Printer,
  Boxes,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

export default function StockTransferPage() {
  const [search, setSearch] = useState('');

  const { data: transfers = [], isLoading } = useQuery<any[]>({
    queryKey: ['stock-transfers-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/transfers?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const q = search.toLowerCase();
      return (
        (t.referenceNo && t.referenceNo.toLowerCase().includes(q)) ||
        (t.fromWarehouse?.name && t.fromWarehouse.name.toLowerCase().includes(q)) ||
        (t.toWarehouse?.name && t.toWarehouse.name.toLowerCase().includes(q))
      );
    });
  }, [transfers, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Inter-Warehouse Stock Transfers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Log stock transit, facility relocations, and receipt acknowledgments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Link href="/transfers">
            <Button size="sm" className="gap-1.5 bg-primary">
              <ArrowLeftRight className="w-4 h-4" /> Initiate Transfer
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by reference or warehouse..."
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
                <TableHead>Transfer Ref</TableHead>
                <TableHead>Origin Facility</TableHead>
                <TableHead>Destination Facility</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading transfers...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No stock transfers recorded.</TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {t.referenceNo || `TR-${t.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="font-medium">{t.fromWarehouse?.name || 'Main Warehouse'}</TableCell>
                    <TableCell className="font-medium">{t.toWarehouse?.name || 'Branch Store'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.date || t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center font-bold">{t.quantity || 1}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">{t.status || 'COMPLETED'}</Badge>
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
