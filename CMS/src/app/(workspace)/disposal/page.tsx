'use client';

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
  Trash2,
  Printer,
} from 'lucide-react';

export default function AssetDisposalPage() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Asset Decommissioning & Disposal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage e-waste disposal, scrap write-offs, and environmental compliance certificates.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Disposal Log
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Decommission Ref</TableHead>
                <TableHead>Asset Title</TableHead>
                <TableHead>Disposal Reason</TableHead>
                <TableHead>Decommission Date</TableHead>
                <TableHead className="text-center">Compliance Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono font-bold text-primary">DEC-2026-001</TableCell>
                <TableCell className="font-medium">Dell PowerEdge Rack Server R730</TableCell>
                <TableCell className="text-sm text-muted-foreground">End-of-Life Lifecycle Retirement</TableCell>
                <TableCell className="text-sm text-muted-foreground">10/11/2026</TableCell>
                <TableCell className="text-center">
                  <Badge variant="default">E-WASTE CERTIFIED</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
