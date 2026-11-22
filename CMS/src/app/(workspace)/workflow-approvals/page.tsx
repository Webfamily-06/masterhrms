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
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  GitPullRequest,
} from 'lucide-react';

export default function WorkflowApprovalsPage() {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ['workflow-approvals-list'],
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Workflow Approval Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Approve, reject, or delegate pending organizational requests across departments.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Approvals
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Request Ref</TableHead>
                <TableHead>Workflow Domain</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading approvals...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No pending approvals requiring sign-off.</TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-semibold text-primary">REQ-{l.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{l.module || l.rule?.name || 'Administrative Approval'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">APPROVED</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
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
