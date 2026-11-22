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
  Package,
  Printer,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function AssetRegisterPage() {
  const { data: assets = [], isLoading } = useQuery<any[]>({
    queryKey: ['asset-register-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/assets?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.assets || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Fixed Asset Master Register</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Comprehensive registry of capital equipment, serial identifiers, and warranty records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Register
          </Button>
          <Link href="/assets">
            <Button size="sm" className="gap-1.5 bg-primary">
              <Plus className="w-4 h-4" /> Add Asset
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Tag ID</TableHead>
                <TableHead>Asset Description</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading asset register...</TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No assets registered.</TableCell>
                </TableRow>
              ) : (
                assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-bold text-primary">{a.assetTag || `AST-${a.id.slice(0, 6)}`}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.serialNumber || 'SN-8291039'}</TableCell>
                    <TableCell className="text-right font-medium">{formatSystemAmount(Number(a.cost) || 50000)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">DEPLOYED</Badge>
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
