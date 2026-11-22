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
  GitPullRequest,
  Printer,
  Clock,
} from 'lucide-react';

export default function WorkflowRequestsPage() {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ['workflow-requests-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/workflows/logs?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.logs || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Workflow Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Audit employee lifecycle requests, leave submissions, and requisition states.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print My Log
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Request ID</TableHead>
                <TableHead>Rule Title</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead className="text-center">Current Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading workflow requests...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No submitted workflow requests on record.</TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-semibold text-primary">LOG-{l.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{l.rule?.name || l.module || 'Automated Rule'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">{l.status || 'SUCCESS'}</Badge>
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
