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
  ShieldAlert,
  Printer,
  CheckCircle2,
} from 'lucide-react';

const SLA_TIERS = [
  { priority: 'P1 - Critical / Outage', response: '15 Minutes', resolution: '2 Hours', targetCompliance: '99.9%' },
  { priority: 'P2 - High Severity', response: '1 Hour', resolution: '6 Hours', targetCompliance: '98.5%' },
  { priority: 'P3 - Medium Operational', response: '4 Hours', resolution: '24 Hours', targetCompliance: '95.0%' },
  { priority: 'P4 - Low / Inquiries', response: '12 Hours', resolution: '48 Hours', targetCompliance: '90.0%' },
];

export default function SlaManagementPage() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Service Level Agreement (SLA) Matrix</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Incident response targets, resolution commitments, and breach penalties.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print SLA Policy
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Severity Level</TableHead>
                <TableHead>Response Time Target</TableHead>
                <TableHead>Resolution Deadline</TableHead>
                <TableHead className="text-center">Target Compliance</TableHead>
                <TableHead className="text-center">Enforcement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SLA_TIERS.map((s, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{s.priority}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-primary">{s.response}</TableCell>
                  <TableCell className="font-mono text-xs">{s.resolution}</TableCell>
                  <TableCell className="text-center font-bold text-emerald-600">{s.targetCompliance}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default">ACTIVE</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
