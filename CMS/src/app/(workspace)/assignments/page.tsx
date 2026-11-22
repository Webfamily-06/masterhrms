'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
  Laptop,
  Printer,
  UserCheck,
} from 'lucide-react';

export default function AssetAssignmentsPage() {
  const { data: assets = [], isLoading } = useQuery<any[]>({
    queryKey: ['asset-assignments-list'],
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Asset Allocations & Custody</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Laptops, peripherals, and workstation equipment allocated to active personnel.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Custody Log
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Asset Tag</TableHead>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Custodian</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead className="text-center">Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading asset assignments...</TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No assets allocated.</TableCell>
                </TableRow>
              ) : (
                assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-bold text-primary">{a.assetTag || a.serialNumber || `AST-${a.id.slice(0, 6)}`}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm">{a.employee?.name || a.assignedTo || 'Assigned Employee'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">GOOD</Badge>
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
