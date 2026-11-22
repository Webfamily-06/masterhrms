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
  Layers,
  Plus,
} from 'lucide-react';

const LEVELS = [
  { level: 1, title: 'Direct Line Manager', appliesTo: 'Leave, Overtime & Expense (< ₹5,000)', sla: '24 Hours' },
  { level: 2, title: 'Department Head (HOD)', appliesTo: 'High Value Expense (₹5,000 - ₹50,000)', sla: '48 Hours' },
  { level: 3, title: 'Finance & HR Director', appliesTo: 'Statutory Filings, Capital Spend & Payroll', sla: '72 Hours' },
  { level: 4, title: 'Executive Board / Managing Director', appliesTo: 'Budget Modifications & Org Restructuring', sla: '5 Days' },
];

export default function WorkflowApprovalLevelsPage() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Workflow Approval Hierarchy Levels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Multi-tiered signing authorities, escalation rules, and delegation tiers.</p>
        </div>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-24 text-center">Tier</TableHead>
                <TableHead>Approval Role</TableHead>
                <TableHead>Scope of Authority</TableHead>
                <TableHead className="text-center">SLA Deadline</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEVELS.map((lvl) => (
                <TableRow key={lvl.level}>
                  <TableCell className="text-center font-bold text-primary">Level {lvl.level}</TableCell>
                  <TableCell className="font-medium">{lvl.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lvl.appliesTo}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{lvl.sla}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default">ENFORCED</Badge>
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
