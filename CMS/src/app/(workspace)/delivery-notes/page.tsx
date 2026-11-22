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
  Truck,
  Search,
  Printer,
  PackageCheck,
  Clock,
  Eye,
} from 'lucide-react';

export default function DeliveryNotesPage() {
  const [search, setSearch] = useState('');

  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['delivery-notes-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/sales?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
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

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Delivery Notes & Dispatches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate dispatch slips, verify outbound consignments, and monitor delivery status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print All Dispatches
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Active Dispatches</p>
              <h3 className="text-2xl font-bold mt-1">{sales.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Delivered & Signed</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {sales.filter((s) => s.paymentStatus === 'PAID').length}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <PackageCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">In Transit</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">
                {sales.filter((s) => s.paymentStatus !== 'PAID').length}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by delivery slip #, order ref, customer..."
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
                <TableHead>DN Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Ref</TableHead>
                <TableHead>Dispatch Date</TableHead>
                <TableHead>Carrier / Logistics</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Print Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading delivery notes...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No delivery dispatches found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      DN-{s.invoiceNo?.replace(/[^0-9]/g, '') || s.id.slice(0, 6)}
                    </TableCell>
                    <TableCell className="font-medium">{s.customerName || 'Counter Customer'}</TableCell>
                    <TableCell className="font-mono text-xs">{s.invoiceNo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.date || s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">Standard Ground Express</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">DISPATCHED</Badge>
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
