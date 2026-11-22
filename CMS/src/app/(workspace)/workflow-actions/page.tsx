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
  Zap,
  Printer,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function WorkflowActionsPage() {
  const { data: rules = [], isLoading } = useQuery<any[]>({
    queryKey: ['workflow-actions-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/workflows/rules');
      return Array.isArray(res.data) ? res.data : res.data?.rules || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Automated Workflow Actions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trigger webhooks, send email notifications, and dispatch system alerts automatically.</p>
        </div>
        <Link href="/workflows">
          <Button size="sm" className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> Configure Trigger
          </Button>
        </Link>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Workflow Action</TableHead>
                <TableHead>Event Trigger</TableHead>
                <TableHead>Destination Action</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading workflow actions...</TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No automated workflow actions configured.</TableCell>
                </TableRow>
              ) : (
                rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        {r.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{r.event || 'EVENT_TRIGGER'}</TableCell>
                    <TableCell className="text-sm">{r.action || 'Send Webhook / Email'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">ACTIVE</Badge>
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
