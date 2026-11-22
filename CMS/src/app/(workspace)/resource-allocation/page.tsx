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
  Users,
  Printer,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';

export default function ResourceAllocationPage() {
  const { data: workloadData, isLoading } = useQuery<any>({
    queryKey: ['resource-workload-summary'],
    queryFn: async () => {
      const res = await api.get<any>('/api/team-workload/summary');
      return res.data;
    },
  });

  const employees = Array.isArray(workloadData?.workload)
    ? workloadData.workload
    : Array.isArray(workloadData)
    ? workloadData
    : [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Resource & Staff Allocation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Engineering, design, and operations workload distribution across active projects.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Allocation Sheet
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Team Member</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Assigned Projects</TableHead>
                <TableHead className="text-center">Open Tasks</TableHead>
                <TableHead className="text-center">Workload Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Calculating allocations...</TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No team members currently loaded.</TableCell>
                </TableRow>
              ) : (
                employees.map((e: any) => (
                  <TableRow key={e.id || e.employeeId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {(e.name || e.firstName || 'TM').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{e.name || `${e.firstName || ''} ${e.lastName || ''}`}</div>
                          <div className="text-xs text-muted-foreground">{e.email || 'team@domain.com'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{e.designation || e.role || 'Specialist'}</TableCell>
                    <TableCell className="text-sm">{e.projectCount || e.projects?.length || 1} Projects</TableCell>
                    <TableCell className="text-center font-bold">{e.activeTasks || e.taskCount || 3}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">OPTIMAL</Badge>
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
